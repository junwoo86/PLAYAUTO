from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import List, Optional

from app.models.user import Group, Permission, GroupPermission


class GroupService:
    @staticmethod
    def get_all_groups(db: Session) -> List[Group]:
        """전체 그룹 목록 조회"""
        return db.query(Group).all()

    @staticmethod
    def get_group_by_id(db: Session, group_id: int) -> Optional[Group]:
        """ID로 그룹 조회"""
        return db.query(Group).filter(Group.id == group_id).first()

    @staticmethod
    def create_group(
        db: Session,
        name: str,
        description: Optional[str],
        created_by: str
    ) -> Group:
        """새 그룹 생성"""
        # 이름 중복 체크
        existing = db.query(Group).filter(Group.name == name).first()
        if existing:
            raise ValueError("이미 존재하는 그룹 이름입니다.")

        group = Group(
            name=name,
            description=description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by=created_by,
            updated_by=created_by
        )

        db.add(group)
        db.commit()
        db.refresh(group)

        return group

    @staticmethod
    def update_group(
        db: Session,
        group_id: int,
        name: Optional[str],
        description: Optional[str],
        updated_by: str
    ) -> Group:
        """그룹 정보 수정"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise ValueError("그룹을 찾을 수 없습니다.")

        if name and name != group.name:
            # 이름 중복 체크
            existing = db.query(Group).filter(
                and_(Group.name == name, Group.id != group_id)
            ).first()
            if existing:
                raise ValueError("이미 존재하는 그룹 이름입니다.")
            group.name = name

        if description is not None:
            group.description = description

        group.updated_by = updated_by
        group.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(group)

        return group

    @staticmethod
    def delete_group(db: Session, group_id: int) -> bool:
        """그룹 삭제"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise ValueError("그룹을 찾을 수 없습니다.")

        # 해당 그룹에 속한 사용자가 있는지 확인
        from app.models.user import User
        users_in_group = db.query(User).filter(User.group_id == group_id).count()
        if users_in_group > 0:
            raise ValueError(f"이 그룹에 {users_in_group}명의 사용자가 속해 있어 삭제할 수 없습니다.")

        # 그룹 권한 매핑 삭제
        db.query(GroupPermission).filter(GroupPermission.group_id == group_id).delete()

        # 그룹 삭제
        db.delete(group)
        db.commit()

        return True

    @staticmethod
    def get_group_permissions(db: Session, group_id: int) -> List[Permission]:
        """그룹의 권한 목록 조회"""
        permissions = db.query(Permission).join(
            GroupPermission,
            Permission.id == GroupPermission.permission_id
        ).filter(
            GroupPermission.group_id == group_id
        ).all()

        return permissions

    @staticmethod
    def update_group_permissions(
        db: Session,
        group_id: int,
        permission_ids: List[int],
        updated_by: str
    ) -> List[Permission]:
        """그룹 권한 업데이트"""
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise ValueError("그룹을 찾을 수 없습니다.")

        # 기존 권한 삭제
        db.query(GroupPermission).filter(GroupPermission.group_id == group_id).delete()

        # 새 권한 추가
        for perm_id in permission_ids:
            # 권한 존재 확인
            permission = db.query(Permission).filter(Permission.id == perm_id).first()
            if permission:
                group_perm = GroupPermission(
                    group_id=group_id,
                    permission_id=perm_id,
                    created_at=datetime.utcnow(),
                    created_by=updated_by
                )
                db.add(group_perm)

        # 그룹 업데이트 시간 갱신
        group.updated_by = updated_by
        group.updated_at = datetime.utcnow()

        db.commit()

        # 업데이트된 권한 목록 반환
        return GroupService.get_group_permissions(db, group_id)

    @staticmethod
    def get_all_permissions(db: Session) -> List[Permission]:
        """전체 권한 목록 조회"""
        return db.query(Permission).all()